
# **👻AnoGhost**

## What you can do with AnoGhost

-   Secure communication, granted by NFT access key
    
-   Zero-knowledge layer between chat members
    
-   Temporary chats as well as temporary messages
    
-   End-to-end message encryption
    
-   Permanently rotating ghostId
    

## How it works & How to create a chat

-   The user connects their wallet on the frontend. We do not store any user info in the database at all, which adds an additional layer of security.
    
-   After connection, a `ghostId` is generated based on the user's wallet and updated via a permanent WebSocket connection with the server. When the connection is broken (e.g., the user leaves the app), the server keeps no record that the user was ever connected.
    
-   Ghost IDs are updated every 5 minutes (currently for development convenience — in production, it will be 2 minutes). While it's impossible to decrypt the ghost ID on the frontend, the server can decrypt the last 12 versions (again, for development purposes — in production, it will be 5). The user can also update their ghost ID at any time.
    

----------

> **Creating a paid chat**

-   The chat initiator must know the ghost ID of the other participant. However, it's impossible to decrypt this ID to reveal the wallet address.
    
-   The initiator pastes the ghost IDs of the invited users and sends a request to the server. The server responds with only one piece of information — whether this ghost was connected within the last (12 versions × 5 minutes) = 60 minutes — while keeping the user’s wallet and current ghost ID secret.
    
-   The initiator then sends funds to the server (via Solana) to mint unique NFT keys — again, without exposing the initiator's wallet. The server also receives the ghost IDs of the invited users.
    
-   The server decrypts the ghost IDs temporarily (without storing them). This process uses Promises instead of loops, allowing the decryption to run in parallel — a more robust approach given the time-sensitive nature of the server’s ability to decrypt.
    
-   The server then encrypts the ghost ID using a random key that can only be decrypted using the server's master key. Even for the same wallet, each encryption results in a unique ghost ID. The same is done for the room ID. Each future NFT owner receives a different room ID in the NFT metadata attributes — even though all keys grant access to the same room.
    
-   The second attribute in the NFT metadata is the **new ghost ID** of the wallet receiving the NFT. This helps prevent unauthorized users from accessing the chat if someone shares their secret NFT key. (In the future, violators may be recorded in a "blocked wallets" table — both the person who shared the NFT and the one who tried to use it — to preserve the app's core purpose.)
    
-   The NFT will also include the chat name as its title. (In the future, this will be moved to metadata attributes and encrypted as well — visible only when the user decides which chat to join. Currently, it's shown for development convenience.)
    
-   When a user joins, they send part of their selected NFT metadata to the server. The server uses its master secret to validate that the user was invited and decrypts the room ID, allowing the user to join. This way, the app keeps **zero track** of who was meant to join or whether they ever did — it only knows who is in the room **right now**. (A more robust zero-knowledge layer between the server and the user will be implemented in the future.)
    

----------

> **Creating a free room**

-   The user shares the `roomId` with other participants. Anyone who knows it can join.
    

----------

### Finally

Once a user joins the room, the initiator can start sending messages. This way, both users know nothing about each other beyond the ghost ID — which has already changed in an unpredictable way.

All messages are **end-to-end encrypted**, meaning only the intended recipient can read them. They are never stored in the database. Once both users leave the room, it is destroyed without leaving any trace.  
(Currently, only temporary messages are destroyed when the user leaves — full message destruction will be implemented soon.)

----------

### Future plans

-   Allow users to create public usernames to solve the issue of needing an external app to share `roomId` and `ghostId`.
    
-   Implement a more robust zero-knowledge layer.
    
-   Enable token-based room access, eliminating the need for users to pay before every chat creation.
