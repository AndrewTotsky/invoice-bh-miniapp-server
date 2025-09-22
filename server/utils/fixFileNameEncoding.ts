export const fixFileNameEncoding = (fileName: string): string => {
                try {
                    // Пробуем исправить кодировку из Windows-1251 в UTF-8
                    const buffer = Buffer.from(fileName, 'binary');
                    const decoded = buffer.toString('utf8');
                    
                    // Если декодирование изменило строку, используем исправленную версию
                    if (decoded !== fileName && !decoded.includes('Ð')) {
                        return decoded;
                    }
                    
                    // Если все еще есть проблемы, используем безопасное имя
                    const safeName = decoded.replace(/[^\w\.\-]/g, '_');
                    return safeName;
                } catch (error) {
                    console.warn('Failed to fix filename encoding:', error);
                    return fileName.replace(/[^\w\.\-]/g, '_');
                }
            };