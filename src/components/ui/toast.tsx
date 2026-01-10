import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        // Adjusted viewport positioning for better mobile safety and centered placement
        className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-[95vw] sm:w-full max-w-sm sm:max-w-md flex-col-reverse p-2 sm:p-4",
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// --- Glassy Base Style ---
const GLASSY_BASE = "pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border p-4 shadow-2xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:fade-in-0"

const toastVariants = cva(
    GLASSY_BASE,
    {
        variants: {
            variant: {
                // REFINED DEFAULT/INFO (Cool Blue/Cyan Gradient for subtle feedback)
                default: "border-cyan-400/30 bg-gradient-to-br from-cyan-900/40 to-cyan-700/60 backdrop-blur-xl text-white shadow-cyan-500/10 ring-1 ring-cyan-500/20",

                // REFINED DESTRUCTIVE (Deep Red Gradient)
                destructive:
                    "destructive group border-red-500/30 bg-gradient-to-br from-red-900/50 to-red-700/70 backdrop-blur-xl text-white shadow-red-500/20 ring-1 ring-red-500/20",

                // ADDED SUCCESS (Green Gradient to match previous toast logic)
                success:
                    "success group border-green-500/30 bg-gradient-to-br from-green-900/50 to-green-700/70 backdrop-blur-xl text-white shadow-green-500/20 ring-1 ring-green-500/20",

                // ADDED WARNING (Yellow/Orange Gradient)
                warning:
                    "warning group border-yellow-500/30 bg-gradient-to-br from-yellow-800/50 to-yellow-600/70 backdrop-blur-xl text-white shadow-yellow-500/20 ring-1 ring-yellow-500/20",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            {...props}
            // 💡 FORCED: 3s duration for ALL toasts as requested
            duration={3000}
        />
    )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            // Refined button style for glassmorphism
            "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-medium transition-colors hover:bg-white/30 disabled:opacity-50",

            // Group color overrides for action button text/border
            "group-[.destructive]:border-red-400/50 group-[.destructive]:text-red-300 group-[.destructive]:hover:bg-red-400/20 group-[.destructive]:hover:text-white",
            "group-[.success]:border-green-400/50 group-[.success]:text-green-300 group-[.success]:hover:bg-green-400/20 group-[.success]:hover:text-white",
            "group-[.warning]:border-yellow-400/50 group-[.warning]:text-yellow-300 group-[.warning]:hover:bg-yellow-400/20 group-[.warning]:hover:text-white",

            className
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            // Refined close button style
            "absolute right-2 top-2 rounded-full p-1 text-white/70 opacity-0 transition-opacity hover:bg-white/10 hover:text-white focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-white/50 group-hover:opacity-100",

            // Group color overrides for close button
            "group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50",
            "group-[.success]:text-green-300 group-[.success]:hover:text-white",
            "group-[.warning]:text-yellow-300 group-[.warning]:hover:text-white",

            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        // Adjusted font styles for hierarchy
        className={cn("text-base font-extrabold text-left", className)}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        // Adjusted font styles for hierarchy
        className={cn("text-sm opacity-80 text-left font-medium", className)}
        {...props}
    />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
}