# Tests

Details manual tests to be carried out in order to ensure proper functionality of all systems.

## Registration

1. Register on a blank database with all fields valid.
    - Should successfully bring you to the dashboard.
2. Attempt to register with the same username but a different password. All other fields should be valid.
    - Should provide a message saying that the username or email has already been taken.
3. Attempt to register with the same email but a different username. All other fields should be valid.
    - Should provide a message saying that the username or email has already been taken.
4. Attempt to register with the same username and email. All other field should be valid.
    - Should provide a message saying that the username or email has already been taken.
5. Attempt to register with a blank password.
    - Should notify the user that the password is invalid.
6. Attempt to register with the a password less than 6 characters long, and the repeat field empty.
    - Should notify the user that the password is invalid, and that the passwords are mismatched.
7. Attempt to register with a password less than 6 characters long, repeating successfully.
    - Should notify the user that the password is invalid.
8. Attempt to register with a blank username.
    - Should notify the user that the username is invalid.
9. Attempt to register with a blank email.
    - Should notify the user that the email is invalid.
9. Attempt to register with a malformed email.
    - Should notify the user that the email is invalid.