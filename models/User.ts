import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    /**
     * ET-M1 — the immutable Google `sub`. Email can be changed or reassigned by
     * the identity provider; this cannot. It is the key new data is owned by.
     *
     * Deliberately has NO default: records created before this field existed
     * simply omit it, and the index is `sparse` so those documents are not
     * indexed at all. A `default: null` would put every legacy user at the same
     * key and break the unique constraint.
     */
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    image: {
      type: String,
      default: null,
    },
    preferredCurrency: {
      type: String,
      default: "₹",
    },
    emailVerified: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
