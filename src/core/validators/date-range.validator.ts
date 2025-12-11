import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidDateRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const dto = args.object as any;
          const startDate = new Date(dto.startDate);
          const endDate = new Date(dto.endDate);

          // Validar que endDate > startDate
          if (endDate <= startDate) {
            return false;
          }

          // Validar rango máximo de 1 año (365 días)
          const diffInMs = endDate.getTime() - startDate.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

          return diffInDays <= 365;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Date range cannot exceed 1 year and end date must be after start date';
        },
      },
    });
  };
}
