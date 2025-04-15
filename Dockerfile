# FROM node:18-alpine As development

# WORKDIR /usr/src/

# COPY package.json ./
# COPY yarn.lock ./ 

# RUN yarn

# COPY . .

# # RUN npm run build

# # Môi trường production (tùy chọn, để tối ưu image)
# FROM node:18-alpine As production

# WORKDIR /usr/src/app

# COPY package*.json ./
# # COPY yarn.lock ./ # Nếu dùng Yarn

# # Chỉ cài đặt production dependencies
# RUN npm ci --only=production
# # RUN yarn install --production # Nếu dùng Yarn

# # Sao chép artifact từ bước build trước (nếu có)
# # COPY --from=development /usr/src/app/dist ./dist
# COPY --from=development /usr/src/app . # Hoặc copy toàn bộ nếu không có build step riêng

# # Expose port mà ứng dụng lắng nghe (phải khớp với PORT trong .env)
# EXPOSE 8080

# # Lệnh mặc định để chạy ứng dụng khi container khởi động
# # CMD [ "node", "dist/main.js" ] # Nếu có build step
# CMD [ "npm", "start" ] # Hoặc lệnh start của bạn