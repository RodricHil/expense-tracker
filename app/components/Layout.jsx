import Navbar from "./Navbar";

export default function Layout({ children, className = "" , id=""}) {
    return (
        <div id={id} className="min-h-screen">
            <Navbar />
            <main className={`px-6 lg:px-12 xl:px-24 3xl:px-60 ${className}`}>
                {children}
            </main>
        </div>
    );
}
