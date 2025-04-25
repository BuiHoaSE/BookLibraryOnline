import Link from 'next/link'
import { Database } from '@/lib/database.types'

type Book = Database['public']['Tables']['books']['Row']

interface BookListProps {
  books: Book[]
}

export default function BookList({ books }: BookListProps) {
  if (books.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">You haven't added any books yet.</p>
        <Link 
          href="/books/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Upload Your First Book
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => (
        <div 
          key={book.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
        >
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2 truncate">{book.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{book.author}</p>
            {book.cover_image_url && (
              <img 
                src={book.cover_image_url} 
                alt={`Cover of ${book.title}`}
                className="w-full h-48 object-contain mb-4 rounded"
              />
            )}
            <div className="flex justify-between items-center">
              <Link
                href={`/books/${book.id}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Read Now
              </Link>
              <span className="text-gray-500 text-sm">
                {book.created_at && new Date(book.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 