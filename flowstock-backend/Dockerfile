FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /src

COPY . .

RUN chmod +x gradlew && ./gradlew :app:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /src/app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
