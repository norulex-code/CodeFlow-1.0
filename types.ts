export interface Account {
    id: string;
    issuer: string;
    name: string;
    secret: string;
    username?: string;
    password?: string;
}
