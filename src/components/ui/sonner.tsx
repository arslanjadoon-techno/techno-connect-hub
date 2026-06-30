import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast border shadow-lg rounded-xl font-medium " +
            "bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700",
          description: "text-sm opacity-80",
          success:
            "!bg-emerald-600 !text-white !border-emerald-700 [&>[data-icon]]:!text-white [&_*]:!text-white",
          error:
            "!bg-red-600 !text-white !border-red-700 [&>[data-icon]]:!text-white [&_*]:!text-white",
          info:
            "!bg-white !text-slate-900 !border-slate-200 dark:!bg-slate-900 dark:!text-slate-50 dark:!border-slate-700",
          warning:
            "!bg-amber-500 !text-white !border-amber-600 [&>[data-icon]]:!text-white [&_*]:!text-white",
          actionButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
