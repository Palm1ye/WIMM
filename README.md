# Where Is My Money?

Where Is My Money? is a mobile application designed to help users track their expenses based on their location. The app utilizes location services to detect when the user visits specific places such as restaurants or cafes. Upon detecting a visit, the app sends a notification prompting the user to input how much they spent at that location. Users can also manually add expenses, view their expense history, and delete entries as needed.

## Features

- **Location-based Expense Tracking:_(not tested yet)_** Automatically prompts users to log expenses when they visit predefined locations.
- **Manual Expense Entry:** Users can manually add expenses with a description and amount.
- **Expense History:** View a history of logged expenses, including descriptions and amounts.
- **Delete Functionality:** Remove expense entries from the history.
- **Multi-Currency Support:** Allows users to select their preferred currency for expense tracking.
- **Localization:** Supports multiple languages for a personalized user experience.
- _It also supports **Push Notifications** but you need to have a Developer account to use that feature. (Not because of me, because of Apple & Google)_

## Technologies Used

- React Native
- Expo
- TypeScript
- React Navigation
- Expo Location
- Expo Notifications
- SQLite (for local database)

## Installation

To run the application locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Palm1ye/WIMM.git
   cd WIMM
   ```
2.	Install dependencies:
   ```
   npm install
   ```
3.	Start the Expo server:
   ```
   npx expo
   ```
4.	Use Expo Go or run on an emulator to view the application.

## Usage

	•	Upon launching the app, grant location permissions for accurate expense tracking.
	•	Visit predefined locations such as restaurants or cafes to receive expense prompts.
	•	Manually add expenses by entering the amount and description.
	•	View and manage expense history from the app interface.

## Contributing

Contributions are welcome! If you’d like to contribute to Where Is My Money?, fork the repository and create a pull request with your proposed changes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

