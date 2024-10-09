import { useQueryNew } from "duck-query"
import { getTodos } from "../../api/getTodos"


export default function TodosPage() {
    const { data, isLoading, isError } = useQueryNew({
        queryKey: "todo",
        queryFn: getTodos,
        staleTime: 5000
    })

    console.log(isError)
    if (isError) return <h1>Error!</h1>
    if (isLoading) return <h1>Loading...</h1>
    console.log(data)

    return (
        <div className="text-white">todos-page</div>
    )
}
