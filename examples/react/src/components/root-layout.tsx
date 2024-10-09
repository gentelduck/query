import { Outlet } from "react-router-dom";
import Header from "./header";

export default function RootLayout() {
    return (
        <>
            <Header />
            <div className="mt-5 px-3">
                <Outlet />
            </div>
        </>
    )
}
