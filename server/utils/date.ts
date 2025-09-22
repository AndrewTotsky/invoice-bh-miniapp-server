const getDate = () => {
    const now = new Date();
    const year = now.getFullYear(); // Год (4 цифры)
    const month = now.getMonth() + 1; // Месяц (0-11 → +1 для 1-12)
    const day = now.getDate();

    return `${day}.${month}.${year}`;
};

const getTime = () => {
    const now = new Date();
    const hours = now.getHours(); // Часы (0-23)
    const minutes = now.getMinutes(); // Минуты (0-59)

    return `${hours}:${minutes}`;
};

export { getDate, getTime };
