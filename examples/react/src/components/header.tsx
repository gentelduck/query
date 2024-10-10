import { Link } from "react-router-dom"

type Link = {
    name: string,
    to: string
}

const LINKS: Link[] = [
    {
        name: "todos",
        to: "/todos"
    }
]

export default function Header() {
    return (
        <header className="bg-[#09090B] p-5 border-b border-b-[#131315] px-5 flex items-center justify-between">
            <Link to={"/"} className="w-[60px] h-[60px]">
                <img className="w-full h-full" src="/emblem-black.png" alt="emblem-black" />
            </Link>
            <ul>
                {
                    LINKS.map((link) => {
                        return <li className="text-white capitalize text-[1.6rem] underline">
                            <Link to={link.to}>{link.name}</Link>
                        </li>
                    })
                }
            </ul>
            <div></div>
        </header>
    )
}
