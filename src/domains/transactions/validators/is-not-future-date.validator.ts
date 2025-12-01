import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsNotFutureDate', async: false })
export class IsNotFutureDate implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments): boolean {
    const date = new Date(dateString);
    const now = new Date();

    // Remove time component for comparison (only compare dates)
    date.setHours(23, 59, 59, 999);

    return date <= now;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Transaction date cannot be in the future';
  }
}
