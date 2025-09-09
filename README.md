# **👻AnoGhost**

## What you can do with AnoGhost

-   Secure communication, granted by NFT access key.
-   Zero-knowledge layer between chat members.
-   End-to-end message and file encryption.
-   Moderated message deletion in public chats.
-   Temporary chats as well as temporary messages.
-   Horizontally scalable, multi-server architecture.

## How it works & How to create a chat

-   The user connects their wallet on the frontend. We do not store any user info in the database at all, which adds an additional layer of security.
-   After connection, a `ghostId` is generated based on the user's wallet and updated via a permanent WebSocket connection with the server. When the connection is broken (e.g., the user leaves the app), the server keeps no record that the user was ever connected.
-   Ghost IDs are updated every 5 minutes (currently for development convenience — in production, it will be 2 minutes). While it's impossible to decrypt the ghost ID on the frontend, the server can decrypt the last 12 versions (again, for development purposes — in production, it will be 5). The user can also update their ghost ID at any time.

---

### **Multi-Ghost Nest Architecture**

The AnoGhost backend is designed as a multi-server, "stateless" system. Each ghost nest operates independently with its own unique `MASTER_SECRET`. This architecture provides several key benefits:

* **Enhanced Anonymity:** A `ghostId` generated on one ghost nest cannot be traced or decrypted on another. This completely isolates user data and activity to a single ghost nest.
* **Improved Security:** A compromise of one ghost nest does not impact the security or integrity of other ghost nests, effectively mitigating risk across the entire network.
* **Horizontal Scalability:** The application can be easily scaled by simply deploying more ghost nests to handle increased user load, without requiring significant changes to the core code or data model.

---

### **Creating a paid chat**

-   The chat initiator must know the ghost ID of the other participant. However, it's impossible to decrypt this ID to reveal the wallet address.
-   The initiator pastes the ghost IDs of the invited users and sends a request to the server. The server responds with only one piece of information — whether this ghost was connected within the last (12 versions × 5 minutes) = 60 minutes — while keeping the user’s wallet and current ghost ID secret.
-   The initiator then sends funds to the server (via Solana) to mint unique NFT keys — again, without exposing the initiator's wallet. The server also receives the ghost IDs of the invited users.
-   The server decrypts the ghost IDs temporarily (without storing them). This process uses Promises instead of loops, allowing the decryption to run in parallel — a more robust approach given the time-sensitive nature of the server’s ability to decrypt.
-   The server then encrypts the ghost ID using a random key that can only be decrypted using the server's master key. Even for the same wallet, each encryption results in a unique ghost ID. The same is done for the room ID. Each future NFT owner receives a different room ID in the NFT metadata attributes — even though all keys grant access to the same room.
-   The second attribute in the NFT metadata is the **new ghost ID** of the wallet receiving the NFT. This helps prevent unauthorized users from accessing the chat if someone shares their secret NFT key. (In the future, violators may be recorded in a "blocked wallets" table — both the person who shared the NFT and the one who tried to use it — to preserve the app's core purpose.)
-   The NFT will also include the chat name as its title. (In the future, this will be moved to metadata attributes and encrypted as well — visible only when the user decides which chat to join. Currently, it's shown for development convenience.)
-   When a user joins, they send part of their selected NFT metadata to the server. The server uses its master secret to validate that the user was invited and decrypts the room ID, allowing the user to join. This way, the app keeps **zero track** of who was meant to join or whether they ever did — it only knows who is in the room **right now**. (A more robust zero-knowledge layer between the server and the user will be implemented in the future.)

---

### **Creating a free room**

-   Public chats are now persistent. A user can create a room, and it will remain active even if all participants leave.
-   The user shares the `roomId` with other participants. Anyone who knows it can join.
-   Message deletion in public chats is moderated: only the original sender can delete their message. The server temporarily holds a record of message ownership for this purpose, which expires automatically after a set time.

---

### **End-to-End File Encryption**

File sharing is now end-to-end encrypted. The server no longer decrypts or reassembles files before broadcasting them. Instead:
-   Files are encrypted on the client-side before being sent.
-   The server receives and stores the encrypted file chunks in memory for a period of **5 minutes**.
-   When a user requests a file, the server sends the encrypted data directly to them.
-   The decryption process is performed exclusively on the recipient's device, using a shared symmetric key, ensuring that the server never has access to the unencrypted file content.

---

### **Future plans**

-   Allow users to create public usernames to solve the issue of needing an external app to share `roomId` and `ghostId`.
-   Implement a more robust zero-knowledge layer.
-   Enable token-based room access, eliminating the need for users to pay before every chat creation.
-   Add a "blocked wallets" table for users who violate sharing policies.