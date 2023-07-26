import { Router } from "express";
import { body } from "express-validator";
import validate from "./validation/valdiate.js";
import bcrypt, { hash } from "bcrypt";
import UserModel from "../models/user.js";
import mongoose from "mongoose";

const userRouter = Router();

userRouter.get("/", async (req, res) => {
  try {
    const { username } = req.query;
    const user = await UserModel.findOne({ username: username });
    res.status(200).json(user);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error: Failure fetching user",
    });
  }
});

userRouter.get("/", async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.status(200).json(users);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error: Failure fetching users",
    });
  }
});

userRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req;

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error: Failure fetching user",
    });
  }
});

// auth user validation rules
const authUserValidationRules = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .trim()
    .escape(),
  body("password").notEmpty().withMessage("Password is required").trim(),
  // Add more validation rules as needed
];

userRouter.post(
  "/auth",
  authUserValidationRules,
  validate,
  async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find the user by username
      const user = await UserModel.findOne({ username: username });

      if (!user) {
        res.status(401).json({
          error: "Authentication failed: Invalid ucredentials",
        });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.status(401).json({
          error: "Authentication failed: Invalid credentials",
        });
        return;
      }

      res.status(200).json(user);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({
        error: "Internal server error: Failure fetching user",
      });
    }
  }
);

// create user validation rules
const createUserValidationRules = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .trim()
    .escape(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/)
    .withMessage(
      "Password must have at least 6 characters, including one lowercase letter, one uppercase letter, and one number."
    )
    .trim(),
  body("email").trim().normalizeEmail(),
  // Add more validation rules as needed
];

userRouter.post("/", createUserValidationRules, validate, async (req, res) => {
  const { username, password, birthdate, email, imageURL, role } = req.body;
  // Check if username already exists in the database
  const existingUser = await UserModel.findOne({ username: username });
  if (existingUser) {
    return res.status(409).json({
      error: "Username already exists",
    });
  }
  // Create a new user
  const coversationObjectId = new mongoose.Types.ObjectId();
  let currentUserIdFirst12Chars = coversationObjectId
    .toString()
    .substring(0, 12);

  let newUser;
  let hasMatchingUsers = true;

  while (hasMatchingUsers) {
    newUser = new UserModel({
      _id: new mongoose.Types.ObjectId(),
      username,
      password,
      birthdate,
      email,
      imageURL,
      role,
    });

    const query = {
      _id: {
        $regex: new RegExp(`^${currentUserIdFirst12Chars}`),
      },
    };

    hasMatchingUsers = await UserModel.exists(query);

    if (hasMatchingUsers) {
      currentUserIdFirst12Chars = newUser._id.toString().substring(0, 12);
    }
  }

  // Save the new user to the database
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    newUser.password = hashedPassword;
  } catch (err) {
    console.error(err.stack);
    return res.status(500).json({
      error: "Internal server error: failed to encrypt user password",
    });
  }

  // Save the new user to the database
  try {
    await newUser.save();
    return res.status(201).json(newUser);
  } catch (err) {
    console.error(err.stack);
    return res.status(500).json({
      error: "Internal server error: failed to save user",
    });
  }
});

userRouter.put(
  "/:id",
  createUserValidationRules,
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { username, password, birthdate, email, imageURL, role } = req.body;
    const user = await UserModel.findOne({ _id: id });
    if (!user) {
      return res.status(409).json({
        error: "Bad request: user does not exist",
      });
    }
    try {
      user.username = username;
      user.password = hashedPassword;
      user.birthdate = birthdate;
      user.role = role;
      await user.save();

      res.status(200).json(user);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({
        error: "Internal server error: failed to update user",
      });
    }
  }
);

// PATCH user route
userRouter.patch(
  "/:id",
  createUserValidationRules,
  validate,
  async (req, res) => {
    const { id } = req.params;
    const { username, password, birthdate, email, imageURL, role } = req.body;

    try {
      const user = await UserModel.findById(id);

      if (!user) {
        return res.status(400).json({
          error: "Bad request: user does not exist",
        });
      }

      if (username) {
        user.username = username;
      }
      if (password) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        user.password = hashedPassword;
      }
      if (birthdate) {
        user.birthdate = birthdate;
      }
      if (email) {
        user.email = email;
      }
      if (imageURL) {
        user.imageURL = imageURL;
      }
      if (role) {
        user.role = role;
      }

      await user.save();

      res.status(200).json(user);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({
        error: "Internal server error: failed to update user",
      });
    }
  }
);

// PATCH All users route
// PATCH All users validation rules
const updateAllUsersValidationRules = [
  body("field").notEmpty().withMessage("Field is required").escape(),
  body("value").optional(),
];

// PATCH All users route
userRouter.patch(
  "/",
  updateAllUsersValidationRules,
  validate,
  async (req, res) => {
    try {
      const { fieldToUpdate, updatedValue } = req.body;
      // Update all users with the provided field and value
      const updateResult = await UserModel.updateMany(
        {},
        { [fieldToUpdate]: updatedValue }
      );
      updateResult.forEach((doc) => {
        doc.save((saveErr) => {
          if (saveErr) {
            // Handle save error
            console.error("Failed to save document:", saveErr);
          }
        });
      });
      res.status(200).json({
        success: "All users updated successfully",
      });
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({
        error: "Internal server error: failed to update users",
      });
    }
  }
);

userRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(400).json({
        error: "User does not exist",
      });
    }
    res.status(200).json({
      success: "User deleted successfully",
    });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal server error: failed to delete user",
    });
  }
});

export default userRouter;
