declare module 'pino-roll' {
    import { DestinationStream } from 'pino';

    export interface RollOptions {
        file: string;
        frequency?: 'daily' | 'hourly';
        mkdir?: boolean;
        size?: string;
    }

    const roll: (options: RollOptions) => DestinationStream;
    export default roll;
}
