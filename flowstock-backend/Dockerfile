FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .
COPY app/build.gradle.kts app/build.gradle.kts

RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

COPY . .

RUN ./gradlew :app:bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=build /app/app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
