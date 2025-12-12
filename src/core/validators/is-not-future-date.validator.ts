import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsNotFutureDate', async: false })
export class IsNotFutureDate implements ValidatorConstraintInterface {
  validate(dateString: string, args: ValidationArguments): boolean {
    if (!dateString) return true; // Si es opcional, @IsOptional lo maneja

    const inputDate = new Date(dateString);
    const now = new Date();

    // Resetear horas para comparar SOLO fechas (sin mutar el original)
    const inputDateOnly = new Date(
      inputDate.getFullYear(),
      inputDate.getMonth(),
      inputDate.getDate(),
    );
    const nowDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    return inputDateOnly <= nowDateOnly;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'La fecha no puede ser futura';
  }
}
