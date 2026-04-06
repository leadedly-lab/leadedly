export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <p className="text-6xl font-bold text-primary mb-4 tabular">404</p>
      <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
      <p className="text-muted-foreground text-sm">The page you're looking for doesn't exist.</p>
    </div>
  );
}
