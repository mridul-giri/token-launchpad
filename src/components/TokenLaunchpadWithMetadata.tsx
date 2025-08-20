import {
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  ExtensionType,
  getAssociatedTokenAddressSync,
  getMintLen,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  type TokenMetadata,
} from "@solana/spl-token-metadata";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

export default function TokenLaunchpadWithMetadata() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const createToken = async () => {
    const mintKeypair = Keypair.generate();

    const metadata: TokenMetadata = {
      mint: mintKeypair.publicKey,
      name: "TOMMY",
      symbol: "TOMMY",
      uri: "https://cdn.100xdevs.com/metadata.json",
      additionalMetadata: [],
    };

    const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
    const metadataLen = pack(metadata).length;
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);

    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataExtension + metadataLen
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey!,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mintKeypair.publicKey,
        wallet.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        9,
        wallet.publicKey!,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mintKeypair.publicKey,
        updateAuthority: wallet.publicKey!,
        mint: mintKeypair.publicKey,
        mintAuthority: wallet.publicKey!,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
      })
    );

    const recentBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = recentBlockhash.blockhash;
    transaction.feePayer = wallet.publicKey!;

    transaction.partialSign(mintKeypair);
    await wallet.sendTransaction(transaction, connection);
    console.log(`Token mint create at: ${mintKeypair.publicKey.toBase58()}`);

    const associatedToken = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      wallet.publicKey!,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    console.log(`associated token: ${associatedToken.toBase58()}`);

    const transaction2 = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey!,
        associatedToken,
        wallet.publicKey!,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
    await wallet.sendTransaction(transaction2, connection);

    const transaction3 = new Transaction().add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedToken,
        wallet.publicKey!,
        1000000000,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
    await wallet.sendTransaction(transaction3, connection);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <h1>Solana Token Launchpad With Metadata</h1>
      <button className="btn" onClick={createToken}>
        Create a token
      </button>
    </div>
  );
}
