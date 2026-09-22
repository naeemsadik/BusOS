import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PermissionsService } from '../permissions/permissions.service';
import {
  User,
  Organization,
  Subscription,
  SubscriptionPlanEntity,
  Invitation,
  UserRole,
  UserStatus,
  SubscriptionStatus,
  SubscriptionPlan,
  InvitationStatus,
} from '../entities';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
  ChangePasswordDto,
  InviteUserDto,
  AcceptInvitationDto,
} from './dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlanEntity)
    private subscriptionPlanRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private permissionsService: PermissionsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, organizationName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create organization (always required now)
    const organization = this.organizationRepository.create({
      name: organizationName,
    });
    const savedOrganization = await this.organizationRepository.save(organization);

    // Create trial subscription - get duration from trial plan
    const trialPlan = await this.subscriptionPlanRepository.findOne({
      where: { planType: SubscriptionPlan.TRIAL, isActive: true },
    });
    const trialDays = trialPlan ? trialPlan.durationDays : 7; // Default to 7 days if plan not found
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    const subscription = this.subscriptionRepository.create({
      organization: savedOrganization,
      plan: SubscriptionPlan.TRIAL,
      status: SubscriptionStatus.TRIAL,
      startDate: new Date(),
      endDate: trialEndDate,
      trialEndDate,
      hasUsedTrial: true,
    });
    await this.subscriptionRepository.save(subscription);

    // Create user (always as OWNER since they create the organization)
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.OWNER,
      status: UserStatus.PENDING,
      organization: savedOrganization,
      emailVerificationToken,
      emailVerificationExpires,
    });

    const savedUser = await this.userRepository.save(user);

    // Send verification email
    try {
      await this.emailService.sendEmailVerification(email, emailVerificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error.message);
      // Don't fail registration if email fails
    }

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: savedUser.id,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization', 'organization.subscription'],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        organization: user.organization,
      },
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    user.isEmailVerified = true;
    user.status = UserStatus.ACTIVE;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepository.save(user);

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error.message);
      // Don't fail verification if welcome email fails
    }

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = uuidv4();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 24);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await this.userRepository.save(user);

    try {
      await this.emailService.sendPasswordReset(email, resetToken);
    } catch (error) {
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resendVerification(resendVerificationDto: ResendVerificationDto) {
    const { email } = resendVerificationDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists and is not verified, a verification email has been sent' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    // Generate new verification token
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await this.userRepository.save(user);

    try {
      await this.emailService.sendEmailVerification(email, emailVerificationToken);
      console.log('Verification email resent successfully');
    } catch (error) {
      console.error('Failed to resend verification email:', error.message);
      // Still continue and return success for security reasons
    }

    return { message: 'If the email exists and is not verified, a verification email has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12', 10);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async inviteUser(invitedById: string, inviteUserDto: InviteUserDto) {
    const { email, role, firstName, lastName } = inviteUserDto;

    const invitedBy = await this.userRepository.findOne({
      where: { id: invitedById },
      relations: ['organization'],
    });

    if (!invitedBy || !invitedBy.organization) {
      throw new NotFoundException('Inviter or organization not found');
    }

    if (invitedBy.role !== UserRole.OWNER) {
      throw new UnauthorizedException('Only owners can invite users');
    }

    // Check if user already exists in organization
    const existingUser = await this.userRepository.findOne({
      where: { email, organizationId: invitedBy.organizationId },
    });

    if (existingUser) {
      throw new ConflictException('User already exists in this organization');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email,
        organizationId: invitedBy.organizationId,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Create invitation
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = this.invitationRepository.create({
      email,
      token,
      role,
      expiresAt,
      invitedBy,
      organization: invitedBy.organization,
    });

    await this.invitationRepository.save(invitation);

    // Send invitation email
    try {
      await this.emailService.sendInvitation(
        email,
        token,
        `${invitedBy.firstName} ${invitedBy.lastName}`,
        invitedBy.organization.name,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error.message);
    }

    return { message: 'Invitation sent successfully' };
  }

  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto) {
    const { token, password, firstName, lastName } = acceptInvitationDto;

    const invitation = await this.invitationRepository.findOne({
      where: { token, status: InvitationStatus.PENDING },
      relations: ['organization', 'invitedBy'],
    });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '12', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: invitation.email,
      password: hashedPassword,
      firstName: firstName || 'User',
      lastName: lastName || '',
      role: invitation.role,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      organization: invitation.organization,
      invitedBy: invitation.invitedBy,
    });

    await this.userRepository.save(user);

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    // Initialize default permissions if the user is staff
    if (user.role === UserRole.STAFF) {
      await this.permissionsService.initializeDefaultPermissions(user.id);
    }

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error.message);
    }

    return { message: 'Invitation accepted successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization', 'organization.subscription'],
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'isEmailVerified', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  
  async getInvitations(organizationId: string) {
    return this.invitationRepository.find({
      where: { organizationId },
      relations: ['organization', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }
  
  async resendInvitation(invitationId: string, organizationId: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { 
        id: invitationId, 
        organizationId,
        status: InvitationStatus.PENDING,
      },
      relations: ['invitedBy', 'organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or not pending');
    }
    
    // Update the expiration date
    invitation.expiresAt = new Date();
    invitation.expiresAt.setDate(invitation.expiresAt.getDate() + 7); // 7 days
    
    await this.invitationRepository.save(invitation);
    
    // Resend the invitation email
    try {
      await this.emailService.sendInvitation(
        invitation.email,
        invitation.token,
        `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
        invitation.organization.name,
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error.message);
    }

    return { message: 'Invitation resent successfully' };
  }
  
  async revokeInvitation(invitationId: string, organizationId: string) {
    const invitation = await this.invitationRepository.findOne({
      where: { 
        id: invitationId, 
        organizationId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or not pending');
    }
    
    // Update status to revoked
    invitation.status = InvitationStatus.REVOKED;
    
    await this.invitationRepository.save(invitation);
    
    return { message: 'Invitation revoked successfully' };
  }
}
