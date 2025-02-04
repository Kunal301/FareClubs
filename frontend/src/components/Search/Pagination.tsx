import type React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onNextPage: () => void
  onPrevPage: () => void
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onNextPage, onPrevPage }) => {
  return (
    <div className="mt-8 flex justify-center items-center space-x-4">
      <button
        onClick={onPrevPage}
        disabled={currentPage === 1}
        className="px-4 py-2 border rounded-md disabled:opacity-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        className="px-4 py-2 border rounded-md disabled:opacity-50"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

