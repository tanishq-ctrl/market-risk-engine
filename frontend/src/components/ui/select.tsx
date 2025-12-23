import * as React from "react"
import { cn } from "@/lib/utils"

type SelectContextValue = {
  value?: string
  onValueChange?: (val: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (val: string) => void
  id?: string
  children: React.ReactNode
  className?: string
}

function collectItems(children: React.ReactNode): Array<{ value: string; label: React.ReactNode }> {
  const items: Array<{ value: string; label: React.ReactNode }> = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // Dive into SelectContent wrappers
    const typeName = (child.type as any)?.displayName
    if (typeName === "SelectContent" || typeName === React.Fragment) {
      items.push(...collectItems(child.props.children))
      return
    }
    if (typeName === "SelectItem" && child.props?.value) {
      items.push({ value: child.props.value, label: child.props.children })
      return
    }
    // Recurse others
    if (child.props?.children) {
      items.push(...collectItems(child.props.children))
    }
  })
  return items
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ value, defaultValue, onValueChange, id, children, className }, ref) => {
    const items = React.useMemo(() => collectItems(children), [children])
    const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
    const currentValue = value ?? internal ?? (items.length ? items[0].value : "")

    const handleChange = (val: string) => {
      setInternal(val)
      onValueChange?.(val)
    }

    return (
      <SelectContext.Provider value={{ value: currentValue, onValueChange }}>
        <select
          id={id}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
        >
          {items.map((it) => (
            <option key={it.value} value={it.value}>
              {it.label}
            </option>
          ))}
        </select>
        {/* Render children for compatibility (hidden) */}
        <div className="hidden">{children}</div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
          className
        )}
        {...props}
      >
        {children || <SelectValue />}
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
  const ctx = React.useContext(SelectContext)
  return <span className="truncate text-left">{ctx?.value ?? placeholder ?? ""}</span>
}
SelectValue.displayName = "SelectValue"

const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
SelectContent.displayName = "SelectContent"

type SelectItemProps = {
  value: string
  children: React.ReactNode
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  // Actual rendering handled by Select; this is a marker component
  return (
    <div data-select-item={value} className="hidden">
      {children}
    </div>
  )
}
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }

