"use client";
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Truck, 
  MessageSquare, 
  Settings, 
  Star, 
  Shield, 
  Zap,
  ChevronRight,
  Play,
  Check,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { brandConfig } from "@/lib/brand-config";
import Cookies from "js-cookie";

export default function InventoryPOSLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Redirect to user's appropriate landing page
      const preferredPage = Cookies.get('preferred_landing_page');
      const targetPage = preferredPage ? `/${preferredPage}` : '/dashboard';
      router.push(targetPage);
    } else {
      router.push('/auth/register');
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      // Redirect to user's appropriate landing page  
      const preferredPage = Cookies.get('preferred_landing_page');
      const targetPage = preferredPage ? `/${preferredPage}` : '/dashboard';
      router.push(targetPage);
    } else {
      router.push('/auth/login');
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: "Dashboard Analytics",
      description: "Real-time insights and comprehensive analytics to drive your business decisions",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Package,
      title: "Inventory Management",
      description: "Advanced stock tracking, automated reordering, and comprehensive product management",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: ShoppingCart,
      title: "Point of Sale",
      description: "Lightning-fast POS system with offline capability and seamless payment processing",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Complete CRM with loyalty programs, customer insights, and engagement tools",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: FileText,
      title: "Order Management",
      description: "Streamlined order processing from creation to fulfillment with automated workflows",
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: CreditCard,
      title: "Payment Processing",
      description: "Secure payment handling with multiple gateway integrations and transaction tracking",
      gradient: "from-teal-500 to-green-500"
    },
    {
      icon: TrendingUp,
      title: "Business Reports",
      description: "Comprehensive reporting suite with customizable dashboards and export options",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: Truck,
      title: "Delivery Management",
      description: "End-to-end delivery tracking with route optimization and customer notifications",
      gradient: "from-pink-500 to-rose-500"
    },
    {
      icon: MessageSquare,
      title: "SMS Integration",
      description: "Automated SMS notifications for orders, payments, and customer engagement",
      gradient: "from-violet-500 to-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/25 animate-pulse"></div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {brandConfig.name}
              </span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">About</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Contact</a>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-blue-600"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            <div className="hidden md:flex gap-2">
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 font-medium"
                onClick={handleGetStarted}
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              </button>
              <button
                className="bg-white border border-blue-500 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-all duration-300 font-medium"
                onClick={handleLogin}
              >
                {isAuthenticated ? 'My Account' : 'Login'}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a href="#features" className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium">Features</a>
                <a href="#about" className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium">About</a>
                <a href="#contact" className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium">Contact</a>
                <button
                  className="w-full mt-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium"
                  onClick={handleGetStarted}
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                </button>
                <button
                  className="w-full mt-2 bg-white border border-blue-500 text-blue-600 px-6 py-2 rounded-lg font-medium"
                  onClick={handleLogin}
                >
                  {isAuthenticated ? 'My Account' : 'Login'}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden pt-16">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-72 h-72 bg-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200/50 shadow-lg mb-8">
              <Zap className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Complete Business Management Solution</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">Business</span> Management
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Revolutionary {brandConfig.name} System with advanced analytics, seamless integrations, and powerful automation tools built with Next.js and TypeScript
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 flex items-center"
                onClick={handleGetStarted}
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Start Free Trial'}
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white border border-gray-200/50 hover:shadow-lg transition-all duration-300 flex items-center">
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">15+</div>
                <div className="text-gray-600">Core Features</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">99.9%</div>
                <div className="text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">24/7</div>
                <div className="text-gray-600">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full border border-blue-200 mb-6">
              <Star className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-700">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive suite of tools to streamline your business operations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 mb-6">
                <Shield className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">Built by Experts</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Crafted with Modern Technology
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Built for maximum performance, scalability, and maintainability. Our responsive design ensures seamless experience across all devices.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  "Next.js & TypeScript for robust development",
                  "Tailwind CSS for modern, responsive design",
                  "Real-time analytics and reporting",
                  "Mobile-first responsive interface",
                  "Secure authentication & authorization"
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Development Team</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Made by Kanect.live</span>
                    <a href="https://kanect.live" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium">
                      Platform ↗
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Md Irfan Hasan Fahim</span>
                    <a href="https://irfanhasan.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium">
                      Portfolio ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* <div className="relative">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">৳2.5M+</div>
                      <div className="text-white/80">Revenue Tracked</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80">Sales Growth</span>
                      <span className="font-semibold">+32%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 w-3/4"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-xl font-bold">1,247</div>
                      <div className="text-white/80 text-sm">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">95%</div>
                      <div className="text-white/80 text-sm">Accuracy</div>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using our platform to streamline operations and boost productivity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              className="bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all duration-300 shadow-2xl hover:shadow-3xl flex items-center"
              onClick={handleGetStarted}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Start Your Free Trial'}
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
            {/* <button className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30">
              Start using now
            </button> */}
          </div>
          
          <div className="mt-8 text-white/80">
            <span className="text-sm">No credit card required • 3-day free trial • Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
                <span className="text-xl font-bold">{brandConfig.name}</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                {brandConfig.fullDescription}
              </p>
                <div className="text-sm text-gray-400">
                <p>Made by <a href="https://kanect.live" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Kanect.live</a></p>
                <p>Developed by <a href="https://irfanhasan.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Md Irfan Hasan Fahim</a></p>
                </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              {brandConfig.copyright}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
