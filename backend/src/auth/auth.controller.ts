
import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() req) {
        // In a real app we would use a LocalGuard here to validate credentials before calling login
        // But for simplicity/speed we can validate in the service or here.
        // Let's assume req has email and password.
        const validUser = await this.authService.validateUser(req.email, req.password);
        if (!validUser) {
            return { message: 'Invalid credentials' }; // Should throw UnauthorizedException
        }
        return this.authService.login(validUser);
    }

    @Post('register')
    async register(@Body() body) {
        return this.authService.register(body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getProfile(@Request() req) {
        return req.user;
    }
}
