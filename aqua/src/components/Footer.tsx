import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black py-8 mt-12 transition-colors duration-300">
            <div className="container mx-auto px-4 max-w-5xl flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <div className="mb-4 md:mb-0">
                    <p>Copyright &copy; {new Date().getFullYear()} Aquado. All rights reserved.</p>
                </div>
                <div className="flex space-x-6">
                    <Link href="/about" className="hover:text-blue-600 dark:hover:text-amber-400 transition-colors">
                        사이트 소개
                    </Link>
                    <Link href="/terms" className="hover:text-blue-600 dark:hover:text-amber-400 transition-colors">
                        이용약관
                    </Link>
                    <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-amber-400 transition-colors">
                        개인정보처리방침
                    </Link>
                    <Link href="/contact" className="hover:text-blue-600 dark:hover:text-amber-400 transition-colors">
                        문의하기
                    </Link>
                </div>
            </div>
        </footer>
    );
}
