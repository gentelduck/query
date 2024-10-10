export type TodoType = {
    id: number;
    completed: boolean;
    title: string;
    userId: number;
};

export default function Todo({ completed, id, title, userId }: TodoType) {
    return (
        <div className="bg-white border border-black rounded-lg p-4 shadow-md w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-black">{title}</h3>
                <span
                    className={`${completed ? 'bg-black text-white' : 'bg-gray-200 text-black'
                        } py-1 px-3 rounded-full text-xs`}
                >
                    {completed ? 'Completed' : 'Pending'}
                </span>
            </div>
            <div className="text-gray-700">
                <p className="text-sm">Task ID: {id}</p>
                <p className="text-sm">User ID: {userId}</p>
            </div>
        </div>
    );
}
