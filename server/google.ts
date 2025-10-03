import { google } from "googleapis";
import path from "path";

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "atmosphere-446403-188ccdf4544d.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const spreadsheetId = "1z3PeNF-dRhMFvBjIiMPDqQBxPmV3ufqDpZE0s1jDw4I"; // ID вашей Google Таблицы

export async function writeToGoogleSheet(data: string[], range: string) {
    // Маппинг данных в соответствии с полями Google Таблицы:
    // МП, Статья МП, Пункт МП, Месяц, ЖК, номер документа основания, 
    // ссылка на документ основания, номер счета, дата счета, сумма счета, 
    // наименование подрядчика, Отправитель
    const mappedData = [
        data[0] || "",          // МП (план)
        data[1] || "",          // Статья МП
        data[2] || "",          // Пункт МП
        data[3] || "",          // Месяц
        data[4] || "",          // ЖК
        data[5] || "",          // номер документа основания
        data[6] || "",          // ссылка на документ основания
        data[7] || "",          // номер счета
        data[8] || "",          // дата счета
        data[9] || "",          // сумма счета
        data[10] || "",         // наименование подрядчика
        data[11] || ""          // Отправитель
    ];

    try {
       console.log(`[${new Date()}] | `+"Отправляем запрос:", mappedData, range);
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: "RAW",
            insertDataOption: "INSERT_ROWS", // Явно указываем вставку новых строк
            requestBody: {
                values: [mappedData],
            },
        });
       console.log(`[${new Date()}] | `+"Получили ответ:", response);
    } catch (error) {
       console.error(`[${new Date()}] | `+"Ошибка записи:", error);
    }
}

export async function updateValueInGoogleSheet(
    userId: string,
    value: string,
    column: string = "G"
): Promise<boolean> {
    try {
        // 1. Найдем строку с нужным userId
        const response = await getSheet();

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
           console.log(`[${new Date()}] | `+"Не найдено данных в таблице");
            return false;
        }

        // 2. Ищем строку с нужным userId
        let rowIndex = -1;
        const idColumn = 2;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][idColumn] === userId) {
                rowIndex = i + 1; // +1 потому что в Sheets нумерация с 1
            }
        }

        if (rowIndex === -1) {
           console.log(`[${new Date()}] | `+`Пользователь с таким ID=${userId} не найден`);
            return false;
        }

        // 3. Обновляем номер телефона
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${writersGPage}${column}${rowIndex}`,
            valueInputOption: "RAW",
            requestBody: {
                values: [[value]],
            },
        });

       console.log(`[${new Date()}] | `+`Номер телефона успешно обновлен в строке ${rowIndex}`);
        return true;
    } catch (error) {
       console.error(`[${new Date()}] | `+"Ошибка при обновлении номера телефона:", error);
        return false;
    }
}

export const getSheet = async () => {
    return await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${writersGPage}A:Z`, // Берем широкий диапазон чтобы захватить все нужные столбцы
    });
};

export const updateRow = async (value: string, column: string, row: string) => {
    // 3. Обновляем номер телефона
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${writersGPage}${column}${row}`,
        valueInputOption: "RAW",
        requestBody: {
            values: [[value]],
        },
    });
};

export const writersGPage = "Лист1!";

export const gRange = "A:F";
