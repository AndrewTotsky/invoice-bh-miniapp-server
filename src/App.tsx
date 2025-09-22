import { useEffect, useState } from "react";
import PaymentForm, { User } from "./InvoiceForm";

function App(): React.JSX.Element {

    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        setUser(tg.initDataUnsafe.user);
    }, []);

    return <PaymentForm user={user} />
}

export default App;
