"use client"

import Image from "next/image"
import Link from "next/link"
import { BookOpen, Search, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

export default function Home() {
  // This would normally come from an auth provider
  const isSignedIn = true
  const user = {
    name: "Jane Smith",
    email: "jane@example.com",
    image: "/placeholder.svg",
  }

  const featuredBooks = [
    { id: 1, title: "To Kill a Mockingbird", author: "Harper Lee", cover: "/placeholder.svg?height=300&width=200" },
    { id: 2, title: "1984", author: "George Orwell", cover: "/placeholder.svg?height=300&width=200" },
    { id: 3, title: "The Great Gatsby", author: "F. Scott Fitzgerald", cover: "/placeholder.svg?height=300&width=200" },
    { id: 4, title: "Pride and Prejudice", author: "Jane Austen", cover: "/placeholder.svg?height=300&width=200" },
    { id: 5, title: "The Catcher in the Rye", author: "J.D. Salinger", cover: "/placeholder.svg?height=300&width=200" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-8 md:py-16 lg:py-20 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-[#1e3a8a]">
                    Your Digital Library,<br />
                    Anywhere, Anytime
                  </h1>
                  <p className="max-w-[600px] text-[#3b82f6] md:text-xl">
                    Library online gives you access to thousands of books at your fingertips. Read, discover, and explore
                    from the comfort of your device.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" className="bg-[#2563eb] hover:bg-blue-700 text-white">
                    Browse Library
                  </Button>
                  <Button variant="outline" size="lg" className="border-[#2563eb] text-[#2563eb] hover:bg-blue-50">
                    Learn More
                  </Button>
                </div>
              </div>
              <div className="relative hidden lg:block">
        <Image
                  src="/images/booklibraryonline.png"
                  alt="Digital Library Interface"
                  width={600}
                  height={450}
                  className="object-contain"
          priority
        />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-blue-800">Featured Books</h2>
                <p className="max-w-[900px] text-blue-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Discover our collection of timeless classics and contemporary bestsellers.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-5">
              {featuredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50 shadow-md"
                >
                  <Link href="#" className="absolute inset-0 z-10">
                    <span className="sr-only">View {book.title}</span>
                  </Link>
            <Image
                    src={book.cover || "/placeholder.svg"}
                    alt={book.title}
                    width={200}
                    height={300}
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-100/90 to-blue-50/0 p-4">
                    <h3 className="font-medium text-sm line-clamp-1 text-blue-900">{book.title}</h3>
                    <p className="text-xs text-blue-700">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-100">
                View All Books
              </Button>
            </div>
          </div>
        </section>

        {isSignedIn && (
          <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-blue-800">
                    Welcome Back, {user.name}
                  </h2>
                  <p className="max-w-[900px] text-blue-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Continue your reading journey where you left off.
                  </p>
                </div>
              </div>
              <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
                <div className="rounded-lg border border-blue-200 bg-white text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-blue-700">12</h3>
                    <p className="text-sm text-blue-600">Books in your library</p>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-blue-700">3</h3>
                    <p className="text-sm text-blue-600">Currently reading</p>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 flex flex-col items-center">
                    <h3 className="text-2xl font-bold text-blue-700">5</h3>
                    <p className="text-sm text-blue-600">Reading lists</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <Button className="bg-blue-600 hover:bg-blue-700">Go to My Library</Button>
              </div>
            </div>
          </section>
        )}

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 px-10 md:gap-16 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-800">Join Today</div>
                <h2 className="lg:leading-tighter text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-blue-800">
                  Start your reading journey with BookStore
                </h2>
                <Button className="bg-blue-600 hover:bg-blue-700">Sign Up Now</Button>
              </div>
              <div className="flex flex-col items-start space-y-4">
                <ul className="grid gap-3">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-blue-100 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-blue-600"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Access to over 10,000 digital books</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-blue-100 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-blue-600"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Read on any device, anytime</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-blue-100 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-blue-600"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Create personalized reading lists</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-blue-100 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-blue-600"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Track your reading progress</span>
                  </li>
                </ul>
              </div>
            </div>
        </div>
        </section>
      </main>
      <footer className="border-t bg-blue-50">
        <div className="container flex flex-col gap-4 py-10 md:flex-row md:gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-blue-800">BookStore</span>
            </div>
            <p className="text-sm text-blue-600">
              Your digital library, anywhere, anytime. Access thousands of books at your fingertips.
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-blue-800">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Press
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-blue-800">Help</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-blue-800">Social</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Instagram
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">
                    Facebook
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container py-6 text-center text-sm text-blue-600">
          &copy; {new Date().getFullYear()} BookStore. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
