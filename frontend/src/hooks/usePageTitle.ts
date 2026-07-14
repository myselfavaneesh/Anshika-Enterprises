import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Anshika Enterprises` : 'Anshika Enterprises';
  }, [title]);
}
