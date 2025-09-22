import { useState } from "react";
import { useForm } from "@mantine/form";
import {
    TextInput,
    NumberInput,
    Select,
    Button,
    Box,
    Group,
    SegmentedControl,
    Progress,
    Stack,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { TelegramService } from "./services/telegramService";

interface FormValues {
    rubles: string;
    kopecks: string;
    period: string;
    invoiceNumber: string;
    invoiceDate: Date | null;
    counterparty: string;
    service: string;
    plan: string;
    planArticle: string;
    mpPoint: string;
    housingComplex: string;
    mediaPlanMonth: string;
    attachedFile: File | null;
    documentName: string;
    documentNumber: string;
    signingMethod: string;
    documentLink: string;
}

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
}

const convertDate = (strDate: string | null): string => {
    const date = new Date(strDate);
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

export default function PaymentForm({ user }: { user: User | null }): React.JSX.Element {
    const form = useForm<FormValues>({
        initialValues: {
            rubles: "50000",
            kopecks: "50",
            period: "с 01.01 по 31.01.2024г",
            invoiceNumber: "123",
            invoiceDate: new Date("2024-01-15"),
            counterparty: "ИП Иванов Иван Иванович",
            service: "за монтаж рекламного баннера",
            plan: "Атмосфера",
            planArticle: "Интернет-маркетинг. Реклама в социальных сетях",
            mpPoint: "11.3",
            housingComplex: "Уютный",
            mediaPlanMonth: "Январь",
            attachedFile: null,
            documentName: "Договор на оказание рекламных услуг",
            documentNumber: "123/2024",
            signingMethod: "Электронная подпись",
            documentLink: "https://example.com/contract-123",
        },
        validate: {
            rubles: (value) =>
                /^\d+$/.test(value)
                    ? null
                    : "Не корректное количество рублей",
            kopecks: (value) =>
                /^\d{0,2}$/.test(value) ? null : "Введите 0-99 копеек",
            invoiceNumber: (value) =>
                value.length > 0 ? null : "Обязательное поле",
            invoiceDate: (value) => (value ? null : "Обязательное поле"),
            period: (value) => (value.length > 0 ? null : "Обязательное поле"),
            counterparty: (value) =>
                value.length > 0 ? null : "Обязательное поле",
            service: (value) => (value.length > 0 ? null : "Обязательное поле"),
            planArticle: (value) =>
                value.length > 0 ? null : "Обязательное поле",
            housingComplex: (value) =>
                selectedPlan === "Атмосфера" && value.length === 0 ? "Обязательное поле" : null,
            mediaPlanMonth: (value) =>
                value.length > 0 ? null : "Обязательное поле",
            documentName: (value, values) =>
                values.attachedFile && value.length === 0 ? "Обязательное поле" : null,
            documentNumber: (value, values) =>
                values.attachedFile && value.length === 0 ? "Обязательное поле" : null,
            signingMethod: (value, values) =>
                values.attachedFile && value.length === 0 ? "Обязательное поле" : null,
            documentLink: (value, values) =>
                values.attachedFile && value.length === 0 ? "Обязательное поле" : null,
        },
    });

    const [resultText, setResultText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState("");
    const [selectedPlan, setSelectedPlan] = useState("Атмосфера");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleSubmit = (values: FormValues): void => {
        const {
            rubles,
            kopecks,
            invoiceNumber,
            invoiceDate,
            period,
            counterparty,
            service,
            planArticle,
            housingComplex,
            mediaPlanMonth,
            mpPoint,
            documentName,
            documentNumber,
            signingMethod,
            documentLink
        } = values;
        const invoice = `№${invoiceNumber} от ${
            invoiceDate ? convertDate(invoiceDate) : ""
            }`;

        const resultInvoice = [
            `«Прошу согласовать оплату в сумме ${rubles} рублей, ${kopecks} копеек`,
            ` по счету ${invoice}`,
            ` за период ${period}`,
            ` подрядчику ${counterparty}`,
            ` за ${service}`,
            ` по МП ${selectedPlan}`,
            ` Статья МП: ${planArticle}`,
            selectedPlan === `Атмосфера` ? ` Пункт МП: ${mpPoint}` : "",
            selectedPlan === "Атмосфера" && housingComplex ? ` ЖК: ${housingComplex}` : "",
            ` Месяц МП: ${mediaPlanMonth}`,
            values.attachedFile ? `\nДокумент основания: <a href="${documentLink}">${documentName}</a>` : "",
            values.attachedFile ? `\nНомер документа основания: ${documentNumber}` : "",
            values.attachedFile ? `\nСпособ подписания: ${signingMethod}` : "",
            `\n\nОтправитель: ${user?.first_name} ${user?.last_name}`,
        ].join("");
        setResultText(resultInvoice);
    };

    const handlePlanChange = (value: string | null): void => {
        if (value) {
            setSelectedPlan(value);
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Проверяем тип файла
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (!allowedTypes.includes(file.type)) {
            setSendStatus("❌ Неподдерживаемый тип файла. Разрешены: изображения, PDF, Word, Excel");
            return;
        }

        // Проверяем размер файла (максимум 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setSendStatus("❌ Файл слишком большой. Максимальный размер: 10MB");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        // Симулируем загрузку с прогрессом
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    setIsUploading(false);
                    form.setFieldValue("attachedFile", file);
                    setSendStatus("✅ Файл успешно загружен!");
                    return 100;
                }
                return prev + 10;
            });
        }, 100);
    };

    const copyToClipboard = async (): Promise<void> => {
        if (!resultText) {
            setSendStatus("Сначала сгенерируйте текст");
            return;
        }

        try {
            await navigator.clipboard.writeText(resultText);
            setSendStatus(
                "✅ Текст скопирован в буфер обмена! Теперь вставьте его в Telegram."
            );
        } catch (error) {
            setSendStatus(
                "❌ Ошибка копирования. Попробуйте выделить и скопировать текст вручную."
            );
        }
    };

    const sendToTelegram = async (): Promise<void> => {
        if (!resultText) {
            setSendStatus("Сначала сгенерируйте текст");
            return;
        }

        setIsSending(true);
        setSendStatus("");

        try {
            const result = await TelegramService.sendMessage({
                message: resultText,
                fields: [
                    form.values.rubles, 
                    form.values.kopecks, 
                    form.values.invoiceNumber, 
                    form.values.invoiceDate ? convertDate(form.values.invoiceDate) : "", 
                    form.values.period, 
                    form.values.counterparty, 
                    form.values.service, 
                    form.values.planArticle, 
                    form.values.housingComplex, 
                    form.values.mediaPlanMonth,
                    form.values.documentName,
                    form.values.documentNumber,
                    form.values.signingMethod,
                    form.values.documentLink
                ],
                channelId: "-1002988617200",
                file: form.values.attachedFile
            });

            if (result.success) {
                setSendStatus("✅ Сообщение успешно отправлено в Telegram!");
            } else {
                setSendStatus(
                    `❌ Ошибка: ${result.message || "Неизвестная ошибка"}`
                );
            }
        } catch (error) {
            setSendStatus(`❌ Ошибка отправки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        } finally {
            setIsSending(false);
        }
    };
    return (
        <Box style={{ maxWidth: 400, padding: "0 16px" }} mx="auto" mt="20px" mb="20px">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Group grow>
                    <Box style={{ minHeight: "80px" }}>
                        <NumberInput
                            label="Рубли"
                            placeholder="789"
                            {...form.getInputProps("rubles")}
                            min={0}
                            hideControls
                        />
                    </Box>
                    <Box style={{ minHeight: "80px" }}>
                        <NumberInput
                            label="Копейки"
                            placeholder="99"
                            {...form.getInputProps("kopecks")}
                            min={0}
                            max={99}
                            hideControls
                        />
                    </Box>
                </Group>

                <Group grow mb="sm">
                    <Box style={{ minHeight: "80px" }}>
                        <TextInput
                            label="Номер счета"
                            placeholder="46"
                            {...form.getInputProps("invoiceNumber")}
                        />
                    </Box>
                    <Box style={{ minHeight: "80px" }}>
                        <DateInput
                            label="Дата счета"
                            placeholder="Выберите дату"
                            {...form.getInputProps("invoiceDate")}
                            valueFormat="DD.MM.YYYY"
                        />
                    </Box>
                </Group>

                <TextInput
                    label="Период оказания услуги"
                    placeholder="с 08.10 по 16.10.2025г"
                    {...form.getInputProps("period")}
                    mb="sm"
                />
                <TextInput
                    label="Контрагент"
                    placeholder="Например, ИП Соколов"
                    {...form.getInputProps("counterparty")}
                    mb="sm"
                />
                <TextInput
                    label="Наименование услуги"
                    placeholder="Например, за монтаж баннера."
                    {...form.getInputProps("service")}
                    mb="sm"
                />
                <Box mb="sm">
                    <label style={{ 
                        fontSize: "14px", 
                        fontWeight: "500", 
                        marginBottom: "8px", 
                        display: "block" 
                    }}>
                        Медиаплан
                    </label>
                    <SegmentedControl
                        data={[
                            { label: "Атмосфера", value: "Атмосфера" },
                            { label: "БХ", value: "БХ" }
                        ]}
                        value={form.values.plan}
                        onChange={(value) => {
                            form.setFieldValue("plan", value);
                            handlePlanChange(value);
                        }}
                        fullWidth
                    />
                </Box>
                <TextInput
                    label={"Напиши название статьи медиаплана"}
                    {...form.getInputProps("planArticle")}
                    mb="sm"
                    placeholder="Например, Интернет.маркетинг. С медиапланами можешь ознакомиться по ссылке."
                />
                {selectedPlan === "Атмосфера" && <TextInput
                    label={"Напиши пункт МП"}
                    {...form.getInputProps("mpPoint")}
                    mb="sm"
                    placeholder="Например, 11.3"
                />}
                {selectedPlan === "Атмосфера" && (
                    <Box mb="sm">
                        <label style={{ 
                            fontSize: "14px", 
                            fontWeight: "500", 
                            marginBottom: "8px", 
                            display: "block" 
                        }}>
                            Укажи ЖК, к которому относятся затраты
                        </label>
                        <SegmentedControl
                            data={[
                                { label: "Уютный", value: "Уютный" },
                                { label: "Чемпион", value: "Чемпион" },
                                { label: "Парковый", value: "Парковый" },
                                { label: "Общий", value: "Общий" }
                            ]}
                            value={form.values.housingComplex}
                            onChange={(value) => {
                                form.setFieldValue("housingComplex", value);
                            }}
                            fullWidth
                        />
                    </Box>
                )}
                <Select
                    label="Выбери месяц медиаплана"
                    data={[
                        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
                    ]}
                    {...form.getInputProps("mediaPlanMonth")}
                    mb="sm"
                />
                <Box mb="sm">
                    <label style={{ 
                        fontSize: "14px", 
                        fontWeight: "500", 
                        marginBottom: "8px", 
                        display: "block" 
                    }}>
                        Прикрепить счет (обязательно)
                    </label>
                    <input
                        type="file"
                        id="file-upload"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                        disabled={isUploading}
                    />
                    <Button
                        component="label"
                        htmlFor="file-upload"
                        variant="outline"
                        fullWidth
                        disabled={isUploading}
                        loading={isUploading}
                    >
                        {isUploading ? "Загрузка..." : form.values.attachedFile ? form.values.attachedFile.name : "Выберите файл"}
                    </Button>
                    {isUploading && (
                        <Progress
                            value={uploadProgress}
                            size="sm"
                            mt="xs"
                            color="blue"
                        />
                    )}
                    {form.values.attachedFile && !isUploading && (
                        <Button
                            variant="subtle"
                            color="red"
                            size="xs"
                            mt="xs"
                            onClick={() => {
                                form.setFieldValue("attachedFile", null);
                                setSendStatus("");
                            }}
                        >
                            Удалить файл
                        </Button>
                    )}
                </Box>

                {/* Дополнительные поля, которые появляются после прикрепления файла */}
                {form.values.attachedFile && (
                    <Box mt="md">
                        <TextInput
                            label="Название документа основания"
                            placeholder="Например, Договор на оказание услуг"
                            {...form.getInputProps("documentName")}
                            mb="sm"
                        />
                        <TextInput
                            label="Номер документа основания"
                            placeholder="Например, 123/2024"
                            {...form.getInputProps("documentNumber")}
                            mb="sm"
                        />
                        <Select
                            label="Способ подписания"
                            placeholder="Выберите способ подписания"
                            data={[
                                "Электронная подпись",
                                "Печатная подпись",
                                "Смешанный способ"
                            ]}
                            {...form.getInputProps("signingMethod")}
                            mb="sm"
                        />
                        <TextInput
                            label="Ссылка на документ"
                            placeholder="https://example.com/document"
                            {...form.getInputProps("documentLink")}
                            mb="sm"
                        />
                    </Box>
                )}

                <Stack mt="md" gap="sm">
                    <Button 
                        type="submit" 
                        fullWidth
                        leftSection="👁️"
                        size="md"
                    >
                        Предпросмотр
                    </Button>
                    <Button
                        onClick={copyToClipboard}
                        disabled={!resultText}
                        color="green"
                        fullWidth
                        leftSection="📋"
                        size="md"
                    >
                        Копировать
                    </Button>
                    <Button
                        onClick={sendToTelegram}
                        disabled={!resultText || isSending}
                        loading={isSending}
                        color="blue"
                        fullWidth
                        leftSection={!isSending ? "📤" : null}
                        size="md"
                    >
                        {isSending ? "Отправка..." : "В Telegram"}
                    </Button>
                </Stack>
            </form>

            {resultText && (
                <Box
                    mt="md"
                    p="md"
                    style={{
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "8px",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-line",
                    }}
                >
                    <strong>Итоговый текст:</strong>
                    <br />
                    <div dangerouslySetInnerHTML={{ __html: resultText }} />
                </Box>
            )}

            {sendStatus && (
                <Box
                    mt="md"
                    p="md"
                    style={{
                        backgroundColor: sendStatus.includes("✅")
                            ? "#d4edda"
                            : "#f8d7da",
                        border: `1px solid ${
                            sendStatus.includes("✅") ? "#c3e6cb" : "#f5c6cb"
                        }`,
                        borderRadius: "8px",
                        color: sendStatus.includes("✅")
                            ? "#155724"
                            : "#721c24",
                        fontSize: "14px",
                    }}
                >
                    {sendStatus}
                </Box>
            )}
        </Box>
    );
}
