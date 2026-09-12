import { Response } from "express";

export const catchErr = (err: Error, res: Response) => {
  res.status(500).json({
    error: err.message
  });
};

export const error = (arg: string, res: Response) => {
  res.status(400).json({
    error: arg
  });
};

export const warning = (arg: string, res: Response) => {
  res.status(401).json({
    warning: arg
  });
};

export const success = (arg: string | object, res: Response) => {
  res.status(200).json({
    success: arg
  });
};