"use client"

import { useEffect, useState } from "react"
import { Book, BookPlus, ChevronDown, Library, Search, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import type { Book as BookType } from "@/lib/supabase"
import { UploadBookDialog } from "@/components/books/upload-book-dialog"
import { ReadBookDialog } from "@/components/books/read-book-dialog"
import { getBookFileUrl } from "@/lib/utils"
import { useSupabase } from "@/components/Providers"

export default function BookDashboard() {
  const supabase = useSupabase();
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<BookType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>("title")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null)

  // Fetch books from Supabase
  useEffect(() => {
    async function fetchBooks() {
      try {
        setLoading(true)
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('*')
        
        if (booksError) throw booksError
        setBooks(booksData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch books')
        console.error('Error fetching books:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [])

  // Get user data
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, [supabase]);

  // Get user initials
  const getUserInitials = () => {
    if (!user?.user_metadata?.name) return 'U';
    return user.user_metadata.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get unique genres from actual data
  const genres = [...new Set(books.map((book) => book.genre))]

  // Filter and sort books
  const filteredBooks = books
    .filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGenre = selectedGenre ? book.genre === selectedGenre : true
      return matchesSearch && matchesGenre
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title)
      if (sortBy === "author") return a.author.localeCompare(b.author)
      if (sortBy === "year") {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        return yearA - yearB;
      }
      return 0
    })

  // Add refresh function
  const refreshBooks = async () => {
    try {
      setLoading(true)
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
      
      if (booksError) throw booksError
      setBooks(booksData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books')
      console.error('Error fetching books:', err)
    } finally {
      setLoading(false)
    }
  }

  // Add debug function
  const handleReadBook = (book: BookType) => {
    console.log('Book metadata:', book);
    
    if (!book.file_url) {
      alert('This book does not have a PDF file attached.');
      return;
    }
    
    // Check if the file URL is valid before opening
    const publicUrl = getBookFileUrl(book.file_url);
    console.log('Generated PDF URL:', publicUrl);
    
    if (!publicUrl) {
      alert('Could not generate a valid URL for this book file.');
      return;
    }
    
    setSelectedBook(book);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="hidden lg:flex h-full w-60 flex-col gap-4 border-r bg-muted/10 p-4">
          <div className="flex h-12 items-center gap-2 px-2">
            <Library className="h-6 w-6" />
            <h2 className="text-lg font-semibold">Library</h2>
          </div>
          <div className="flex-1">
            <nav className="grid gap-1">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Book className="h-4 w-4" />
                All Books
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <header className="border-b">
            <div className="flex h-14 items-center gap-4 px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search books..."
                className="flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <UploadBookDialog onUploadComplete={refreshBooks} />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Books</h2>
                <Badge variant="outline">{filteredBooks.length}</Badge>
                {selectedGenre && (
                  <Badge className="ml-2 bg-primary/10 text-primary border-primary/20">
                    {selectedGenre}
                    <button className="ml-1 hover:text-primary/80" onClick={() => setSelectedGenre(null)}>
                      ×
                    </button>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="year">Publication Year</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode("grid")}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none"
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Book Grid/List */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBooks.map((book) => (
                  <Card key={book.id} className="overflow-hidden relative group h-[360px] transition-all duration-300">
                    {/* Cover image and overlays */}
                    <div className="absolute inset-0">
                      <img
                        src={book.cover_image_url || "/placeholder.svg"}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20 transition-all duration-300 group-hover:from-black group-hover:via-black/75 group-hover:to-black/40" />
                      {/* Additional color tint for visual interest */}
                      <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 mix-blend-overlay transition-all duration-300" />
                    </div>
                    
                    {/* Content layer - ensure high z-index */}
                    <div className="relative z-20 flex flex-col h-full">
                      <CardHeader className="flex-1">
                        <div className="transform transition-transform duration-300 group-hover:translate-y-1">
                          <CardTitle className="line-clamp-2 text-xl group-hover:text-2xl font-semibold group-hover:font-bold text-white/90 group-hover:text-white transition-all duration-300 drop-shadow-lg group-hover:drop-shadow-xl">
                            {book.title}
                          </CardTitle>
                          <p className="text-base group-hover:text-lg text-white/80 group-hover:text-white mt-2 group-hover:mt-3 transition-all duration-300 font-normal group-hover:font-medium drop-shadow-lg group-hover:drop-shadow-xl">
                            {book.author}
                          </p>
                          <p className="text-white/70 group-hover:text-white/80 mt-1 transition-all duration-300 drop-shadow-md group-hover:drop-shadow-lg">
                            {book.year}
                          </p>
                        </div>
                      </CardHeader>
                      
                      <CardFooter className="mt-auto">
                        <div className="flex items-center justify-between w-full">
                          <div className="relative">
                            <Button 
                              variant="secondary"
                              size="sm"
                              onClick={() => handleReadBook(book)}
                              className="bg-black/30 hover:bg-white/20 text-white/90 group-hover:text-white border-white/20 group-hover:border-white/30 backdrop-blur-sm font-normal group-hover:font-medium transition-all duration-300 min-w-[100px] relative z-10"
                            >
                              Read Book{book.current_page && book.page_count && Math.round((book.current_page / book.page_count) * 100) > 0 ? ` (${Math.round((book.current_page / book.page_count) * 100)}%)` : ''}
                            </Button>
                            {book.current_page && book.page_count && (
                              <div 
                                className="absolute inset-0 bg-blue-500/70 group-hover:bg-blue-600/80 rounded-md transition-all duration-300"
                                style={{ 
                                  width: `${(book.current_page / book.page_count) * 100}%`,
                                  maxWidth: '100%'
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </CardFooter>
                    </div>
                  </Card>
                ))}              </div>
            ) : (
              <div className="space-y-2">
                {filteredBooks.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <img
                      src={book.cover_image_url || "/placeholder.svg"}
                      alt={book.title}
                      className="w-16 h-24 object-contain rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {book.author}, {book.year}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{book.genre}</Badge>
                      
                      {/* Match exact style of grid view button */}
                      <div className="relative min-w-[160px]">
                        {/* Base button with dark blue background */}
                        <div className="w-full h-9 rounded-md bg-blue-800 relative overflow-hidden shadow-sm">
                          {/* Progress fill with lighter blue */}
                          {book.current_page && book.page_count && (
                            <div 
                              className="absolute inset-0 bg-blue-600 h-full"
                              style={{ 
                                width: `${(book.current_page / book.page_count) * 100}%`,
                              }}
                            />
                          )}
                          
                          {/* Text overlay */}
                          <button 
                            className="absolute inset-0 w-full h-full flex items-center justify-center text-white font-medium text-sm"
                            onClick={() => handleReadBook(book)}
                          >
                            Read Book{book.current_page && book.page_count && Math.round((book.current_page / book.page_count) * 100) > 0 ? ` (${Math.round((book.current_page / book.page_count) * 100)}%)` : ''}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Add ReadBookDialog that opens when a book is selected */}
      {selectedBook && (
        <ReadBookDialog
          open={!!selectedBook}
          onOpenChange={(open) => {
            if (!open) setSelectedBook(null);
          }}
          fileUrl={selectedBook ? getBookFileUrl(selectedBook.file_url) : ''}
          bookId={selectedBook?.id || ''}
          onProgressSaved={refreshBooks}
        />
      )}
    </div>
  )
}