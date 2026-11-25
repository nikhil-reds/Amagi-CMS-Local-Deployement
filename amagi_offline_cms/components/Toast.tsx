export type ToastData = {
  message: string;
  type: "success" | "error";
};

type Props = {
  toast: ToastData | null;
};

export default function Toast({ toast }: Props) {
  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-sm border transition-all
        ${isSuccess
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"}`}
    >
      {isSuccess ? (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {toast.message}
    </div>
  );
}
