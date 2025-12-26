import { Logo } from "@/components/logo";


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="fixed w-full h-20 bg-accent text-white flex items-center justify-center">
        <Logo />
        {/* <Link href='#' >Home</Link> */}
      </header>
      {children}
    </>
  );
}