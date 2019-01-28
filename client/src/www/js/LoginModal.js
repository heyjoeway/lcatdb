import AppNavigator from "./AppNavigator";
import Modal from "./Modal";

class LoginModal {
    static open() {
        if (LoginModal._isOpen) return;
    
        LoginModal._isOpen = true;
        
        (new Modal({
            title: "Login",
            url: "./loginModal.html",
            callback: () => {
                LoginModal._isOpen = false;
                AppNavigator.reload();
            }
        })).lock();
    }
}

export default LoginModal;