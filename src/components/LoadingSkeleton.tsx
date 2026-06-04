export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-[#161616] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow h-[400px] flex flex-col justify-between p-5">
          {/* Visual Shimmer Screen */}
          <div className="w-full h-44 bg-[#202020] rounded-xl flex items-center justify-center">
            <div className="w-10 h-10 bg-[#2C2C2C] rounded-full" />
          </div>

          <div className="space-y-3 mt-4">
            {/* Title Line */}
            <div className="h-4 bg-[#2C2C2C] rounded w-3/4" />
            
            {/* Details Lines */}
            <div className="space-y-2">
              <div className="h-3 bg-[#202020] rounded w-1/2 flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-[#2C2C2C] rounded" />
                <div className="h-2 bg-[#2C2C2C] rounded w-full" />
              </div>
              <div className="h-3 bg-[#202020] rounded w-5/6 flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-[#2C2C2C] rounded" />
                <div className="h-2 bg-[#2C2C2C] rounded w-full" />
              </div>
              <div className="h-3 bg-[#202020] rounded w-1/3 flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-[#2C2C2C] rounded" />
                <div className="h-2 bg-[#2C2C2C] rounded w-full" />
              </div>
            </div>
          </div>

          {/* Action button mock */}
          <div className="h-10 bg-[#202020] border border-[#2A2A2A] rounded-xl w-full mt-4" />
        </div>
      ))}
    </div>
  );
}
