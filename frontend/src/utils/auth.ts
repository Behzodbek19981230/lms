export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('e_token');
}