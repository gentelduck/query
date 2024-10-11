import { useQueryNew } from "duck-query"
import { getTodos } from "../../api/getTodos"
import Todo, { TodoType } from "../todo"
import { TodoSkeleton } from "../ui/skeleton/todo-skeleton"


export default function TodosPage() {
    const { data, isLoading, isError } = useQueryNew<TodoType[]>({
        queryKey: "todo",
        queryFn: getTodos,
        staleTime: 10000,
    })

    if (isError) return <h1 className="text-white">Error!</h1>
    if (isLoading) return <div className="text-white grid grid-cols-4 max-lg:grid-cols-1 gap-4">
        {
            Array.from({ length: 10 }).map(() => {
                return <TodoSkeleton />
            })
        }
    </div>

    return (
        <div className="text-white grid grid-cols-4 max-lg:grid-cols-1 gap-4">
            {
                data?.map((todo) => {
                    return <Todo {...todo} />
                })
            }
        </div>
    )
}
