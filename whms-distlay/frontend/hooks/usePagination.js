'use client';

import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1, initialLimit = 50) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const updateMeta = useCallback((meta) => {
    if (meta) {
      setPage(meta.page || 1);
      setLimit(meta.limit || initialLimit);
      setTotal(meta.total || 0);
      setPages(meta.pages || 1);
    }
  }, [initialLimit]);

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, Math.min(newPage, pages)));
  }, [pages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const canPrevious = page > 1;
  const canNext = page < pages;

  return {
    page,
    limit,
    total,
    pages,
    setPage,
    setLimit,
    updateMeta,
    goToPage,
    nextPage,
    prevPage,
    canPrevious,
    canNext,
  };
}
