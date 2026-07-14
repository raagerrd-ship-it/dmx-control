import { BrowserRouter, Route, Routes } from "react-router-dom";
import DmxController from "./pages/DmxController.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/" element={<DmxController />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
