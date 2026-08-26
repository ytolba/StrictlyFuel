// index.tsx

import "react-native/Libraries/Core/InitializeCore";
import { registerRootComponent } from "expo";
import App from "./App";

// registerRootComponent calls App.registerRootComponent(App) internally
registerRootComponent(App);
