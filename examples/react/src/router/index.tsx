import { createBrowserRouter } from "react-router-dom"
import RootLayout from "../components/root-layout"
import TodosPage from "../components/pages/todos-page"



export const router = createBrowserRouter([{
    path: "/",
    element: <RootLayout />,
    children: [{
        path: "todos",
        element: <TodosPage />
    }]
}])