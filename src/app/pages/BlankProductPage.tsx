export default function BlankProductPage({ productName }: { productName: string }) {
  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">Blank</h1>
        <p className="text-white/40 text-sm">{productName}</p>
      </div>
    </div>
  );
}
