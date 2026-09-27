import Navbar from "./Navbar";

export default function Layout({ children, className = "" , id=""}) {
    return (
        <div id={id} className="min-h-screen">
            <Navbar />
            <main id="main-content" tabIndex={-1} className={`app-shell ${className}`}>
                {children}
            </main>
        </div>
    );
}
