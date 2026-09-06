'use client';

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { brandConfig } from "@/lib/brand-config";

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const pathname = usePathname();
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Check localStorage for sidebar state on mount
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar:collapsed');
        if (savedState) {
            setIsCollapsed(savedState === 'true');
        }
    }, []);

    // Save sidebar state on change
    useEffect(() => {
        localStorage.setItem('sidebar:collapsed', isCollapsed.toString());
    }, [isCollapsed]);

    const isAuthPage = pathname?.startsWith('/auth') || pathname === '/verify-email' || pathname === '/accept-invitation';

    if (isAuthPage || !isAuthenticated) {
        return <main className="h-screen">{children}</main>;
    }

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background dark:bg-background transition-colors duration-300">
            {/* Mobile sidebar overlay */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden" 
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div className={`
                ${isMobile ? 'fixed inset-y-0 left-0 z-30 transform transition-transform duration-200 ease-in-out' : 'relative'}
                ${isCollapsed && !isMobile ? 'w-16' : isMobile ? 'w-full xs:w-80 sm:w-64' : 'w-64 xl:w-72'}
                ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
                transition-all duration-300
            `}>
                <Sidebar 
                    onClose={() => setSidebarOpen(false)} 
                    isMobile={isMobile} 
                    isCollapsed={isCollapsed} 
                    onToggleCollapse={toggleCollapse}
                />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Mobile header */}
                {isMobile && (
                    <header className="lg:hidden bg-card dark:bg-card border-b dark:border-zinc-800 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(true)}
                            className="h-8 w-8 sm:h-10 sm:w-10 text-foreground"
                        >
                            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                        <h1 className="font-semibold text-sm sm:text-base truncate text-foreground">{brandConfig.name}</h1>
                        <div className="w-8 sm:w-10" /> {/* Spacer for centering */}
                    </header>
                )}
                
                <main className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 xl:p-6 bg-background dark:bg-background text-foreground dark:text-foreground transition-colors duration-300">
                    {children}
                </main>
            </div>
        </div>
    );
}