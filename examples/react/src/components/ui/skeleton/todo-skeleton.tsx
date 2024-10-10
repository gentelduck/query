export function TodoSkeleton() {
    return (
        <div className="animate-pulse bg-white border border-black rounded-lg p-4 shadow-md w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
            </div>
            <div className="text-gray-700">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
        </div>
    );
}
