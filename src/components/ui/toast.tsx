"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type ToastVariant = "default" | "destructive"

export type Toast = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string }
  | { type: "DISMISS_TOAST"; id: string }

type ToastState = {
  toasts: Toast[]
}

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      }
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

let toastCount = 0

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER
  return toastCount.toString()
}

type ToastContextType = {
  toasts: Toast[]
  toast: (props: Omit<Toast, "id">) => string
  dismiss: (id: string) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] })

  const timeoutsRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  const removeToast = React.useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", id })
    const timeout = timeoutsRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(id)
    }
  }, [])

  const dismiss = React.useCallback(
    (id: string) => {
      dispatch({ type: "DISMISS_TOAST", id })
      const timeout = timeoutsRef.current.get(id)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(id)
      }
    },
    []
  )

  const toast = React.useCallback(
    (props: Omit<Toast, "id">) => {
      const id = genId()
      const duration = props.duration ?? 5000

      dispatch({
        type: "ADD_TOAST",
        toast: { ...props, id },
      })

      const timeout = setTimeout(() => {
        dismiss(id)
      }, duration)

      timeoutsRef.current.set(id, timeout)

      return id
    },
    [dismiss]
  )

  React.useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  return (
    <ToastContext.Provider
      value={{ toasts: state.toasts, toast, dismiss, removeToast }}
    >
      {children}
      <ToastViewport>
        {state.toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </ToastViewport>
    </ToastContext.Provider>
  )
}

function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastViewport({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
    >
      {children}
    </div>
  )
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  return (
    <div
      data-state="open"
      className={cn(toastVariants({ variant: t.variant }), "mb-2")}
    >
      <div className="grid gap-1">
        {t.title && (
          <div className="text-sm font-semibold">{t.title}</div>
        )}
        {t.description && (
          <div className="text-sm opacity-90">{t.description}</div>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export {
  ToastProvider,
  ToastViewport,
  ToastItem,
  useToast,
  toastVariants,
}
