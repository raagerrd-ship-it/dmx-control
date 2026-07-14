import { BrowserRouter, Route, Routes } from "react-router-dom";
import DmxController from "./pages/DmxController.tsx";
import LiveConsole from "./pages/LiveConsole.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/" element={<DmxController />} />
      <Route path="/live" element={<LiveConsole />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
